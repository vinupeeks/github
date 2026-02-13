
import React, { useEffect, useState } from 'react';
import { User, Lock, Eye, EyeClosed, EyeIcon, CheckCircle, X } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useForm } from 'react-hook-form';
import { yupResolver } from '../../../node_modules/@hookform/resolvers/yup/src/yup';
import { generateValidationSchema } from '../../utils/validationSchema';
import { useLoginMutation } from '../../redux/services/userApi';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../../redux/reducers/authReducers';
import { RouteConstant } from '../../routes/RouteConstant';
import { Link, useNavigate } from 'react-router-dom';
import loginbgImg from '../../assets/loginbgship.jpg';
import { toggleSnackbar } from '../../redux/reducers/optionsReducers';

const LoginScreen =()=> {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);

  const dispatch = useDispatch()
  const navigate = useNavigate();
  
  const [login, {isLoading, isError, error}] = useLoginMutation();

  const [isVisiblePassword, setIsVisiblePassword] = useState(false)
  
  const formData = [
      {
          label: "Email",
          name: "email",
          required: true
      },
      {
          label: "Password",
          name: "password",
          required: true,
          min: 4,
          max: 36
      }
  ]

  const { handleSubmit, register, formState: {errors} } = useForm({
      resolver: yupResolver(generateValidationSchema(formData))
  })

  const onSubmit = async(data) => {
    try {
      
        const response = await login(data)
        
        if(response?.data?.success) {
            const us = response?.data?.data
            dispatch(setUser(us));
            
            const roleRoutes = {
                'super admin': RouteConstant.DASHBOARD,
                'user': RouteConstant.DASHBOARD
            };
            
            const userRole = us.role?.role;
            const targetRoute = roleRoutes[userRole] || RouteConstant.DASHBOARD;
            
            navigate(targetRoute);

        }else{

          const res = response?.error?.data?.message?.toLowerCase() || "";

          let message = response?.error?.data?.message || "Something went wrong"
          let description = response?.error?.data?.description || "Please try again or contact support if the issue continues.";

          if(response?.isExpired) {
            message = message
            description = description
          } else if (res.includes("email")) {
            message = "Incorrect email or password";
            description = "Please check your login details and try again.";
          }
          dispatch(toggleSnackbar({
            open: true,
            message: message,
            description: description,
            severity: 'error'
          }))
        }

    } catch (error) {
        console.error("Login error:", error);
    }
  }

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowFullscreenVideo(false);
      }
    };

    if (showFullscreenVideo) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showFullscreenVideo]);

  const analysis = [
    {
      main: "The SIRE 2.0 report analysis uses a detailed severity scoring system to evaluate risks identified during inspections.",
    },
    {
      main: "Scores are assigned to Nature of Concerns (NOC) based on negative findings across Hardware, Process, Human Factors, and Photograph categories.",
    },
    {
      main: 'A key feature is the distinction between "Core" and "Rotational" questions.',
    },
    {
      main: "Observations linked to high-risk Core VIQs receive significantly higher severity points.",
    },
    {
      main: "The system differentiates human severity scores according to the ranks of crew members, such as senior officers versus junior officers.",
    },
    {
      main: "It provides a ranking of the VIQs with the most negative findings across a specified fleet.",
    },
    {
      main: "This comprehensive approach enables a more nuanced, risk-based analysis of a vessel's operational and process safety.",
    },
    {
      main: "The developers can customise the software to meet a client's specific requirements.",
    },
    {
      main: "Data Privacy Guarantee: We ensure the privacy of your uploaded PDF reports.",
      sub: ["Your data is used exclusively for your analysis.", "It is never used for any other purpose."],
    },
    {
      main: "Report Extraction Standard: The extraction is done based on the format shared by OCIMF.",
      sub: [
        "OCIMF Format Link https://www.ocimf.org/doclink/lxhq-2893-4382-6569-original/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJseGhxLTI4OTMtNDM4Mi02NTY5LW9yaWdpbmFsIiwiaWF0IjoxNjczNjEyMDUyLCJleHAiOjE2NzM2OTg0NTJ9.QMl8qOxtGOj6PZa6kReacSXg3YDgYXhm_YnAJV8nfME"
      ],
    },
  ];

  return (
    <div
    className="min-h-screen bg-gradient-to-br flex items-center justify-center p-4"
    style={{
    backgroundImage: `url(${loginbgImg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-transparent"></div>
      <div 
      className="
      relative z-10
      w-full 
      max-w-6xl
      max-h-[525px]
      rounded-2xl 
      shadow-2xl 
      overflow-hidden
      grid lg:grid-cols-2"
      >
        <div className="hidden lg:block relative bg-white/60 backdrop-blur p-6 shadow-lg">
          <h3 className="text-xl font-semibold mb-4">SIRE 2.0 Report Analysis</h3>
        
          <div className="max-h-34 overflow-y-auto pr-2 mb-6">
            {analysis.map((item, index) => (
              <div key={index} className="mb-4 text-gray-800 text-sm">
                <p className="flex items-start gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>{item.main}</span>
                </p>
                {item.sub &&
                  item.sub.map((subPoint, subIndex) => (
                    <p key={subIndex} className="flex items-start gap-2 pl-7 mb-1">
                      <span className="w-2 h-2 mt-2 bg-green-400 rounded-full flex-shrink-0"></span>
                      {subPoint.includes('http') ? (
                        <a
                          href={subPoint.match(/https?:\/\/\S+/)[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          OCIMF Format Link
                        </a>
                      ) : (
                        <span>{subPoint}</span>
                      )}
                    </p>
                  ))}
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">Quick Start Guide</h3>
            {showPlayer ? (
              <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src="https://www.youtube.com/embed/8r0YlQ0xpVA?si=T3RtHmymoXQb8CDO"
                  title="Quick Start"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            ) : (
              <div className="relative group">
                <img
                src="https://img.youtube.com/vi/8r0YlQ0xpVA/maxresdefault.jpg"
                alt="YouTube thumbnail"
                onClick={() => setShowFullscreenVideo(true)}
                className="cursor-pointer rounded shadow hover:scale-105 transition-transform h-60 w-full"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/60 rounded-full p-4 group-hover:bg-black/80 transition-colors">
                    <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 lg:p-12 flex flex-col justify-center bg-gradient-to-b from-[#bcdff7] via-[#ccf6f1] to-[#a7d8f2] relative">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center w-36 px-3 py-1 bg-white rounded-full">
              <img src={logo} alt="sire logo" />
            </div>
          </div>

          <div className="text-center mb-8">
            {/* <h1 className="text-3xl font-bold mb-2 bg-gradient-to-l from-blue-500 to-purple-500 bg-clip-text text-transparent"> */}
            <h1 className="text-3xl font-bold mb-2 text-gray-700 bg-clip-text">
              SIRE 2.0 ANALYTICS
            </h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-5">
              <div className='relative'>
                  <div className='absolute top-[12px] left-3'>
                      <User size={22} color="#2e2d2d" />
                  </div>
                  <input
                  type="text"
                  {...register('email')}
                  name="email"
                  placeholder="Enter your email"
                  className="w-full px-4 pl-[45px] py-3 border border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent placeholder-[#2e2d2d] text-[#1b1b1b] text-[14px] h-12"
                  />
                  {
                      errors?.email &&
                      <div className='text-[12px] text-red-400 pt-2'>{errors?.email?.message}</div>
                  }
              </div>
              <div className='relative'>
                  <div className='absolute top-[12px] left-3'>
                      <Lock size={22} color="#2e2d2d" />
                  </div>
                  <input
                  type={isVisiblePassword ? "text" : "password"}
                  {...register('password')}
                  name="password"
                  placeholder="Enter your password"
                  className="w-full px-4 pl-[45px] border border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent placeholder-[#2e2d2d] text-[#2e2d2d] text-[14px] h-12"
                  />
                  {
                      errors?.password &&
                      <div className='text-[12px] text-red-400 pt-2'>{errors?.password?.message}</div>
                  }
                  <div className='absolute top-[15px] right-3'>
                      {
                          isVisiblePassword ? 
                          <EyeClosed size={22} color="#2e2d2d" onClick={()=> setIsVisiblePassword(!isVisiblePassword)} />:
                          <EyeIcon size={22} color="#2e2d2d" onClick={()=> setIsVisiblePassword(!isVisiblePassword)} />
                      }
                  </div>
              </div>
              <div className="flex justify-between mt-1 mb-4">
                  <div />
                  <Link to={RouteConstant.FORGOTPASSWORD}>Forgot Password?</Link>
              </div>
              <button
              type="submit"
              // className="w-full bg-blue-400 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              className="w-full bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-medium py-3 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
              Login
              </button>
            </div>
          </form>
          <div className="text-black text-sm mt-10 text-center">
            <p>Contact us at: 
              <a href="mailto:support@sireanalysis.com"
                className="underline ml-2"> 
                info@solmarinetech.com
              </a>
            </p>
            <p className="mt-1">© {new Date().getFullYear()} SIRE 2.0 Analysis. All rights reserved.</p>
          </div>
          </div>
        </div>

        {showFullscreenVideo && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setShowFullscreenVideo(false)}
              className="absolute top-4 right-4 z-60 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
            >
              <X size={24} color="white" />
            </button>
            
            {/* Video container */}
            <div className="w-full h-full max-w-6xl max-h-[90vh] mx-4">
              <div className="aspect-video w-full h-full rounded-lg overflow-hidden shadow-2xl">
                <iframe
                  // src="https://www.youtube.com/embed/sVH4d0bzvUI?autoplay=1&rel=0"
                  // src="https://www.youtube.com/embed/G23m7nk1v5I?autoplay=1&rel=0"
                  src="https://www.youtube.com/embed/8r0YlQ0xpVA?autoplay=1&rel=0"
                  title="Quick Start Video - Fullscreen"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>
            
            {/* Click outside to close */}
            <div 
              className="absolute inset-0 -z-10"
              onClick={() => setShowFullscreenVideo(false)}
            ></div>
          </div>
        )}

    </div>
  );
}

export default LoginScreen